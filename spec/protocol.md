```bash
cd /workspaces/hjs-api/spec
cat > protocol.md << 'EOF'
# HJS Core Protocol Specification

**Version**: v1.0.0  
**Last Updated**: 2026-02-19  
**Follows**: [Semantic Versioning 2.0.0](VERSIONING.md)

---

## 1. Core Primitives

HJS defines four core primitives as the minimal structural units for responsibility tracing.

| Primitive | Description | API Resource |
|-----------|-------------|--------------|
| **Judgment** | Records a decision event, including actor, action, and scope | `POST /judgments` |
| **Delegation** | Records transfer of authority or responsibility | (reserved) |
| **Termination** | Records termination of responsibility or delegation | (reserved) |
| **Attribution** | Records association relationships between parties | (reserved) |

---

## 2. Data Structures

### 2.1 Judgment Event

```json
{
  "id": "string",                // Unique event ID, format: jgd_[timestamp]_[random]
  "entity": "string",            // Identifier of the entity making the judgment (required)
  "action": "string",            // The action being recorded (required)
  "scope": "object",             // Scope data (optional)
  "timestamp": "string",         // Event time, ISO 8601 (optional, defaults to server time)
  "recorded_at": "string",       // Record creation time, ISO 8601 (system generated)
  "immutability_anchor": {       // Immutability anchor (optional)
    "type": "string",            // Anchor type: ots, merkle, trusted_timestamp, none
    "reference": "string",       // Type-specific reference (optional)
    "anchored_at": "string"      // Anchor time, ISO 8601 (optional)
  }
}
```

### 2.2 Anchor Interface Specification

The `immutability_anchor` field MUST adhere to the following rules:

- **type**: MUST be one of the enumerated values: `ots`, `merkle`, `trusted_timestamp`, `none`.
- **reference**: SHOULD be provided when `type` is not `none` (e.g., URL to proof file, Merkle root hash).
- **anchored_at**: SHOULD be provided when anchoring is complete (ISO 8601 timestamp).

**Example** (OTS anchor, submitted but not confirmed):

```json
"immutability_anchor": {
  "type": "ots",
  "anchored_at": null
}
```

---

## 3. Implementation Requirements

Any implementation claiming conformance to the HJS protocol MUST:

1. Support at least one anchor type (OTS is the recommended reference implementation).
2. Include the `immutability_anchor` field in all records, adhering to its enumerated rules.
3. Ensure interoperability with other conforming implementations under the same major version.

---

## 4. Extensibility

The protocol reserves extension points for future evolution:

- New anchor types MAY be added through the [RFC process](rfcs/).
- Additional primitives (e.g., Delegation, Termination) will be defined based on real-world requirements and MAY be introduced in minor version updates.

---

## 5. Versioning and Compatibility

This specification follows [Semantic Versioning 2.0.0](VERSIONING.md). Any changes that break backward compatibility will result in a major version increment. Implementations MUST specify which protocol version they support.
EOF
```