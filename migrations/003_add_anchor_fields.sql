-- 迁移说明：将锚定字段从 OTS 专用改为通用结构
-- 执行时间：2026-02-18

-- 1. 添加新字段（先允许为空）
ALTER TABLE judgments 
  ADD COLUMN anchor_type VARCHAR(50) DEFAULT 'none',
  ADD COLUMN anchor_reference TEXT,
  ADD COLUMN anchor_processed_at TIMESTAMPTZ,
  ADD COLUMN anchor_proof BYTEA;

-- 2. 迁移旧数据
UPDATE judgments 
SET 
  anchor_type = CASE 
    WHEN ots_proof IS NOT NULL THEN 'ots' 
    ELSE 'none' 
  END,
  anchor_proof = ots_proof,
  anchor_processed_at = CASE 
    WHEN ots_verified = true THEN NOW() 
    ELSE NULL 
  END
WHERE ots_proof IS NOT NULL OR ots_verified IS NOT NULL;

-- 3. 验证迁移结果
SELECT id, 
       ots_proof IS NOT NULL as had_ots, 
       anchor_type, 
       anchor_proof IS NOT NULL as has_proof,
       anchor_processed_at 
FROM judgments 
LIMIT 5;
