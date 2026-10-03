import { FileBlob, PresentationFile } from "file:///C:/Users/hp/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs";

const sourcePath = process.argv[2];
const search = process.argv[3];
if (!sourcePath) throw new Error("source path required");
const presentation = await PresentationFile.importPptx(await FileBlob.load(sourcePath));
const snapshot = await presentation.inspect({
  kind: "slide,textbox,shape,image,table,chart,notes,layout",
  include: "id,slide,name,title,text,textPreview,textChars,textLines,bbox,bboxUnit",
  ...(search ? { search } : {}),
  maxChars: 50000,
});
process.stdout.write(snapshot.ndjson);
