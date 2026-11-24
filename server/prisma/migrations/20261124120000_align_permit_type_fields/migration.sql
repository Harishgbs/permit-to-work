UPDATE "Permit"
SET "typeData" = jsonb_set("typeData", '{hotWorkType}', '"SOLDERING"'::jsonb)
WHERE "type" = 'HOT_WORK'
  AND "typeData" ->> 'hotWorkType' = 'BRAZING';

UPDATE "Permit"
SET "typeData" = jsonb_set(
  "typeData",
  '{accessMethod}',
  CASE
    WHEN lower("typeData" ->> 'accessMethod') LIKE '%scaffold%' THEN '"SCAFFOLD"'::jsonb
    WHEN lower("typeData" ->> 'accessMethod') LIKE '%ladder%' THEN '"LADDER"'::jsonb
    WHEN lower("typeData" ->> 'accessMethod') LIKE '%mewp%' THEN '"MEWP"'::jsonb
    WHEN lower("typeData" ->> 'accessMethod') LIKE '%rope%' THEN '"ROPE"'::jsonb
    ELSE "typeData" -> 'accessMethod'
  END
)
WHERE "type" = 'WORKING_AT_HEIGHT'
  AND "typeData" ? 'accessMethod'
  AND (
    lower("typeData" ->> 'accessMethod') LIKE '%scaffold%'
    OR lower("typeData" ->> 'accessMethod') LIKE '%ladder%'
    OR lower("typeData" ->> 'accessMethod') LIKE '%mewp%'
    OR lower("typeData" ->> 'accessMethod') LIKE '%rope%'
  );

UPDATE "Permit"
SET "typeData" = (
  jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          "typeData",
          '{isolationPoints}',
          CASE
            WHEN jsonb_typeof("typeData" -> 'isolationPoints') = 'array' THEN
              CASE
                WHEN jsonb_array_length("typeData" -> 'isolationPoints') > 0 THEN "typeData" -> 'isolationPoints'
                ELSE jsonb_build_array('Legacy isolation-point list not recorded; review required')
              END
            WHEN "typeData" ? 'isolationPoints' THEN
              jsonb_build_array(
                'Legacy isolation-point count: ' || COALESCE("typeData" ->> 'isolationPoints', 'unknown') || '; review required'
              )
            ELSE jsonb_build_array('Legacy isolation-point list not recorded; review required')
          END
        ),
        '{lockNumbers}',
        CASE
          WHEN jsonb_typeof("typeData" -> 'lockNumbers') = 'array' THEN
            CASE
              WHEN jsonb_array_length("typeData" -> 'lockNumbers') > 0 THEN "typeData" -> 'lockNumbers'
              ELSE jsonb_build_array('Legacy lock numbers not recorded; review required')
            END
          WHEN jsonb_typeof("typeData" -> 'lockTagNumbers') = 'array' THEN
            CASE
              WHEN jsonb_array_length("typeData" -> 'lockTagNumbers') > 0 THEN "typeData" -> 'lockTagNumbers'
              ELSE jsonb_build_array('Legacy lock numbers not recorded; review required')
            END
          ELSE jsonb_build_array('Legacy lock numbers not recorded; review required')
        END
      ),
      '{tagNumbers}',
      CASE
        WHEN jsonb_typeof("typeData" -> 'tagNumbers') = 'array' THEN
          CASE
            WHEN jsonb_array_length("typeData" -> 'tagNumbers') > 0 THEN "typeData" -> 'tagNumbers'
            ELSE jsonb_build_array('Legacy tag numbers not recorded; review required')
          END
        WHEN jsonb_typeof("typeData" -> 'lockTagNumbers') = 'array' THEN
          CASE
            WHEN jsonb_array_length("typeData" -> 'lockTagNumbers') > 0 THEN "typeData" -> 'lockTagNumbers'
            ELSE jsonb_build_array('Legacy tag numbers not recorded; review required')
          END
        ELSE jsonb_build_array('Legacy tag numbers not recorded; review required')
      END
    ),
    '{earthingApplied}',
    CASE
      WHEN jsonb_typeof("typeData" -> 'earthingApplied') = 'boolean' THEN "typeData" -> 'earthingApplied'
      WHEN jsonb_typeof("typeData" -> 'earthing') = 'boolean' THEN "typeData" -> 'earthing'
      ELSE 'false'::jsonb
    END
  ) - 'lockTagNumbers'
) - 'earthing'
WHERE "type" = 'ELECTRICAL_LOTO';
