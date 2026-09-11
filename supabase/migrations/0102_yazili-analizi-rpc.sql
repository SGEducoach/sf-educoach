-- SG EduCoach -- Yazılı Analizi Modülü - Transactional Save RPC
-- This RPC creates an exam and all related data in a single transaction.
-- It assumes the caller (server action) has already computed the estimated scores
-- via the Smart Estimation V1 algorithm and prepared the necessary arrays.

CREATE OR REPLACE FUNCTION public.yazili_sinav_olustur(
    p_sinifId uuid,
    p_ders text,
    p_ad text,
    p_tarih date,
    p_ogretmenId uuid,
    p_ogrencier jsonb, -- [{"id":"<uuid>","toplamPuan":<int>}, ...]
    p_temsiliOgrenciIds uuid[], -- representative student ids
    p_temsiliOgrenciSkorlar jsonb, -- {"<uuid>": [<int>,<int>,...], ...}
    p_maxPuanlar integer[], -- [max per question, ...]
    p_kazanimlar text[], -- [learning outcome per question, ...]
    p_soruSonuclari jsonb -- [{"ogrenci_id":"<uuid>","sira":<int>,"puan":<int>,"kaynak":"actual|estimated","estimation_version":"v1|null"}, ...]
) RETURNS uuid AS $$
DECLARE
    v_sinavId uuid;
    v_m integer;
BEGIN
    IF auth.uid() IS NULL OR auth.uid() <> p_ogretmenId THEN
        RAISE EXCEPTION 'Oturum öğretmen kimliğiyle eşleşmiyor';
    END IF;
    IF array_length(p_maxPuanlar, 1) IS DISTINCT FROM array_length(p_kazanimlar, 1)
       OR EXISTS (SELECT 1 FROM unnest(p_kazanimlar) AS k WHERE length(trim(k)) = 0) THEN
        RAISE EXCEPTION 'Her soru için bir kazanım girilmelidir';
    END IF;
    -- Authorization: teacher must have permission for this class/ders
    IF NOT EXISTS (
        SELECT 1 FROM public.ogretmen_dersleri
        WHERE teacher_id = p_ogretmenId
          AND class_id = p_sinifId
          AND ders = p_ders
    ) THEN
        RAISE EXCEPTION 'Bu sınıf ve ders için yetkiniz yok';
    END IF;

    -- 1. Insert exam
    INSERT INTO public.yazili_sinavlar (class_id, ogretmen_id, ad, tarih, ders)
    VALUES (p_sinifId, p_ogretmenId, p_ad, p_tarih, p_ders)
    RETURNING id INTO v_sinavId;

    -- 2. Insert questions (sira 1..m)
    v_m := array_length(p_maxPuanlar, 1);
    INSERT INTO public.yazili_sorular (yazili_sinav_id, sira, max_puan, kazanim)
    SELECT v_sinavId, sira, p_maxPuanlar[sira], trim(p_kazanimlar[sira])
    FROM generate_series(1, v_m) AS sira;
    -- No need to retain IDs; we will match by sira in soru results.

    -- 3. Insert student results (toplam not)
    INSERT INTO public.yazili_ogrenci_sonuclari (yazili_sinav_id, ogrenci_id, toplam_puan, temsilci_mi)
    SELECT v_sinavId,
           (elem->>'id')::uuid,
           (elem->>'toplamPuan')::integer,
           (elem->>'id')::uuid = ANY(p_temsiliOgrenciIds)
    FROM jsonb_array_elements(p_ogrencier) AS elem;

    -- 4. Insert question results
    INSERT INTO public.yazili_soru_sonuclari (yazili_sinav_id, ogrenci_id, soru_id, puan, kaynak, estimation_version)
    SELECT v_sinavId,
           (ss->>'ogrenci_id')::uuid AS ogrenci_id,
           s.id AS soru_id,
           (ss->>'puan')::integer AS puan,
           ss->>'kaynak' AS kaynak,
           ss->>'estimation_version' AS estimation_version
    FROM jsonb_array_elements(p_soruSonuclari) AS ss
    JOIN public.yazili_sorular s
      ON s.yazili_sinav_id = v_sinavId
     AND s.sira = (ss->>'sira')::integer;

    RETURN v_sinavId;
EXCEPTION
    WHEN OTHERS THEN
        -- Any error will cause the whole transaction to abort.
        RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (or service role via server action)
GRANT EXECUTE ON FUNCTION public.yazili_sinav_olustur TO anon, authenticated;
