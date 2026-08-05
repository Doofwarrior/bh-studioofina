# BH Studio Changelog

## Format

```
## [Version] — YYYY-MM-DD

### Added
### Changed
### Fixed
### Removed
```

---

## [1.0.0] — TBD

### Added
- Initial release
- Project CRUD and dashboard
- Workspace management
- AI Bridge with OpenAI provider
- Core skills: referenceIntelligence, exportIntelligence, decisionArchive
- Islamic skill: visualDirector
- Prompt library
- Export system
- Backup system
- Bilingual export support (Bengali/English)

### Architecture
- Three-layer design: Application → AI Skills → Workspace
- Workspace outside Git repository
- AI Bridge as sole LLM gateway
- Modular skill system with standard interface
- Project-first workspace model
