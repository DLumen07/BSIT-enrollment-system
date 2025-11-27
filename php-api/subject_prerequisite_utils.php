<?php
declare(strict_types=1);

/**
 * Ensures the subject_prerequisites pivot table exists.
 *
 * @throws Exception
 */
function ensure_subject_prerequisites_table(mysqli $conn): void
{
    static $ensured = false;
    if ($ensured) {
        return;
    }

    $sql = <<<SQL
CREATE TABLE IF NOT EXISTS subject_prerequisites (
    subject_id INT(11) NOT NULL,
    prerequisite_subject_id INT(11) NOT NULL,
    PRIMARY KEY (subject_id, prerequisite_subject_id),
    KEY idx_subject_prereq_requirement (prerequisite_subject_id),
    CONSTRAINT fk_subject_prereq_subject FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE CASCADE,
    CONSTRAINT fk_subject_prereq_requirement FOREIGN KEY (prerequisite_subject_id) REFERENCES subjects (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
SQL;

    if (!$conn->query($sql)) {
        throw new Exception('Failed to ensure subject_prerequisites table exists: ' . $conn->error);
    }

    $ensured = true;
}

/**
 * Normalizes a list of prerequisite codes into uppercase strings without duplicates.
 *
 * @param mixed $rawList Incoming list (array|string|null) of codes.
 * @param string|null $singleFallback Optional single prerequisite code provided by legacy fields.
 *
 * @return string[]
 */
function normalize_prerequisite_codes($rawList, ?string $singleFallback = null): array
{
    $codes = [];
    $append = static function (?string $value) use (&$codes): void {
        if ($value === null) {
            return;
        }
        $normalized = strtoupper(trim($value));
        if ($normalized === '') {
            return;
        }
        $codes[] = $normalized;
    };

    if (is_array($rawList)) {
        foreach ($rawList as $value) {
            if (is_string($value) || is_numeric($value)) {
                $append((string) $value);
            }
        }
    } elseif (is_string($rawList) || is_numeric($rawList)) {
        $append((string) $rawList);
    }

    if ($singleFallback !== null && $singleFallback !== '') {
        $append($singleFallback);
    }

    if (empty($codes)) {
        return [];
    }

    return array_values(array_unique($codes));
}

/**
 * Resolves subject IDs for the provided prerequisite codes.
 *
 * @param string[] $codes
 *
 * @return int[] IDs ordered to match the provided codes.
 * @throws Exception
 */
function resolve_prerequisite_ids(mysqli $conn, array $codes): array
{
    if (empty($codes)) {
        return [];
    }

    $ids = [];

    foreach ($codes as $code) {
        $stmt = $conn->prepare('SELECT id FROM subjects WHERE code = ? LIMIT 1');
        if (!$stmt) {
            throw new Exception('Failed to prepare prerequisite lookup: ' . $conn->error);
        }
        $stmt->bind_param('s', $code);
        $stmt->execute();
        $stmt->bind_result($prereqId);
        if ($stmt->fetch()) {
            $ids[] = (int) $prereqId;
        } else {
            $stmt->close();
            throw new InvalidArgumentException(sprintf('The prerequisite subject "%s" was not found.', $code));
        }
        $stmt->close();
    }

    return $ids;
}

/**
 * Replaces the prerequisite rows for the given subject.
 *
 * @param int[] $prerequisiteIds
 */
function sync_subject_prerequisites(mysqli $conn, int $subjectId, array $prerequisiteIds): void
{
    ensure_subject_prerequisites_table($conn);

    $deleteStmt = $conn->prepare('DELETE FROM subject_prerequisites WHERE subject_id = ?');
    if (!$deleteStmt) {
        throw new Exception('Failed to prepare prerequisite cleanup: ' . $conn->error);
    }
    $deleteStmt->bind_param('i', $subjectId);
    $deleteStmt->execute();
    $deleteStmt->close();

    if (empty($prerequisiteIds)) {
        return;
    }

    $insertStmt = $conn->prepare('INSERT INTO subject_prerequisites (subject_id, prerequisite_subject_id) VALUES (?, ?)');
    if (!$insertStmt) {
        throw new Exception('Failed to prepare prerequisite insert: ' . $conn->error);
    }

    foreach ($prerequisiteIds as $prereqId) {
        $insertStmt->bind_param('ii', $subjectId, $prereqId);
        $insertStmt->execute();
    }

    $insertStmt->close();
}

/**
 * Builds a map of subject IDs to prerequisite codes for quick lookups.
 *
 * @return array<int, string[]>
 */
function fetch_subject_prerequisite_map(mysqli $conn): array
{
    ensure_subject_prerequisites_table($conn);

    $map = [];
    $sql = 'SELECT sp.subject_id, prereq.code AS prerequisite_code
            FROM subject_prerequisites sp
            INNER JOIN subjects prereq ON prereq.id = sp.prerequisite_subject_id
            ORDER BY sp.subject_id, prereq.code';

    $result = $conn->query($sql);
    if (!$result) {
        throw new Exception('Failed to fetch subject prerequisites: ' . $conn->error);
    }

    while ($row = $result->fetch_assoc()) {
        $subjectId = (int) $row['subject_id'];
        $code = isset($row['prerequisite_code']) ? (string) $row['prerequisite_code'] : '';
        if ($code === '') {
            continue;
        }
        if (!isset($map[$subjectId])) {
            $map[$subjectId] = [];
        }
        $map[$subjectId][] = $code;
    }

    $result->free();

    return $map;
}
