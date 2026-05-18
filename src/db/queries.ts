export const INSERT_ENTRY = `
  INSERT INTO entries (id, payload, embedding, created_at, previous_id, action, signature, payload_hash)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`;

export const INSERT_VECTOR = `
  INSERT INTO entry_vectors(rowid, embedding) VALUES (?, ?)
`;

export const GET_ENTRY_BY_ID = `
  SELECT id, payload, created_at, previous_id, action FROM entries WHERE id = ?
`;

export const GET_LAST_ENTRY_ID = `
  SELECT id FROM entries ORDER BY created_at DESC LIMIT 1
`;

export const GET_LAST_N_ENTRIES = `
  SELECT id, payload, payload_hash, previous_id
  FROM entries ORDER BY created_at DESC LIMIT ?
`;

export const ACTIVE_ENTRIES_RECENCY = `
  WITH superseded AS (
    SELECT previous_id FROM entries
    WHERE action IN ('amend', 'redact') AND previous_id IS NOT NULL
  )
  SELECT id, payload, created_at, previous_id, action
  FROM entries
  WHERE action != 'redact'
    AND id NOT IN (SELECT previous_id FROM superseded)
  ORDER BY created_at DESC
  LIMIT ?
`;

export const ACTIVE_ENTRIES_VECTOR = `
  WITH superseded AS (
    SELECT previous_id FROM entries
    WHERE action IN ('amend', 'redact') AND previous_id IS NOT NULL
  )
  SELECT e.id, e.payload, e.created_at, e.previous_id, e.action
  FROM entries e
  JOIN (
    SELECT rowid, distance FROM entry_vectors
    WHERE embedding MATCH ? ORDER BY distance LIMIT ?
  ) ev ON e.rowid = ev.rowid
  WHERE e.action != 'redact'
    AND e.id NOT IN (SELECT previous_id FROM superseded)
  ORDER BY ev.distance
  LIMIT ?
`;
