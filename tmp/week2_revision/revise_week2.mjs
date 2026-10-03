import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { FileBlob, PresentationFile } from "file:///C:/Users/hp/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs";

process.env.RUNTIME_NODE_MODULES = "C:/Users/hp/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules";
process.env.RUNTIME_NODE = "C:/Users/hp/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe";

const workspaceDir = "E:/SG_EDUCOACH";
const sourceDir = path.join(workspaceDir, "tmp/week2_revision/source");
const outputDir = path.join(workspaceDir, "output/week2_revision");
const stagingRoot = path.join(workspaceDir, "tmp/week2_revision/finalizer-v3");
const skillDir = "C:/Users/hp/.codex/plugins/cache/openai-primary-runtime/presentations/26.905.11957/skills/presentations";
const pythonExecutable = "C:/Users/hp/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe";
const { finalizePresentation } = await import(pathToFileURL(path.join(skillDir, "container_tools/artifact_tool_utils.mjs")).href);

const jobs = [
  {
    name: "H02-2_SY_Ders4_BasitTuremis_Tam_Sunum.pptx",
    replacements: [["blokta", "Blokta"]],
  },
  {
    name: "H02-3_SA_Ders3_BaglamYorumlamaDeyim_Tam_Sunum.pptx",
    replacements: [
      ["blokta", "Blokta"],
      ["Testiyi kırdı.", "Baltayı taşa vurdu."],
      ["İşi bitirmeden büyük bir hata yaptı", "İstemeden yersiz bir söz söyledi"],
      ["testiyi kırmak", "baltayı taşa vurmak"],
      ["telafisi güç bir hata yapmak", "yersiz söz söylemek"],
      ["Suyun öte yüzüne geçti.", "Köprüleri attı."],
      ["Hayatını değiştirdi", "Geçmişle bağlarını kopardı"],
    ],
  },
  {
    name: "H02-4_CA_Ders1_TemelKavramlar_Tam_Sunum.pptx",
    replacements: [["blokta", "Blokta"]],
  },
];

async function replaceUnique(presentation, search, replacement) {
  const snapshot = await presentation.inspect({
    kind: "textbox",
    include: "id,slide,name,text,textPreview",
    search,
    maxChars: 8000,
  });
  const records = snapshot.ndjson.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
  const matches = records.filter((record) => record.kind === "textbox" && typeof record.text === "string" && record.text.includes(search));
  if (matches.length !== 1) {
    throw new Error(`${search}: expected exactly one match, found ${matches.length}`);
  }
  presentation.resolve(matches[0].id).text.replace(search, replacement);
  return { slide: matches[0].slide, id: matches[0].id, search, replacement };
}

await fs.mkdir(outputDir, { recursive: true });
await fs.mkdir(stagingRoot, { recursive: true });

const results = [];
for (const job of jobs) {
  const sourcePath = path.join(sourceDir, job.name);
  const finalPath = path.join(outputDir, job.name);
  const presentation = await PresentationFile.importPptx(await FileBlob.load(sourcePath));
  const changes = [];
  for (const [search, replacement] of job.replacements) {
    changes.push(await replaceUnique(presentation, search, replacement));
  }
  const stagingDir = path.join(stagingRoot, path.parse(job.name).name);
  await fs.mkdir(stagingDir, { recursive: true });
  const candidatePath = path.join(stagingDir, "candidate.pptx");
  await (await PresentationFile.exportPptx(presentation)).save(candidatePath);
  const result = await finalizePresentation({
    explicitTotalSlideCount: 24,
    requiredNativeTableOwnerSlides: [],
    requiredNativeChartOwnerSlides: [],
    workspaceDir,
    candidatePath,
    finalPath,
    pythonExecutable,
    integrityValidatorPath: path.join(skillDir, "container_tools/inspect_presentation_package_integrity.py"),
    layoutValidatorPath: path.join(skillDir, "container_tools/inspect_presentation_layout_geometry.py"),
    layoutArgs: [
      "--expected-slide-size-emu", "12192000,6858000",
      "--validate-bullet-geometry",
      "--validate-heading-fit",
    ],
    verifyArtifactToolImport: true,
    receiptPath: path.join(stagingDir, `${job.name}.validation.json`),
  });
  results.push({ name: job.name, changes, finalPath, result });
}

process.stdout.write(JSON.stringify(results, null, 2));
