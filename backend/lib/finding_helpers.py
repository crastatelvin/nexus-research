def _finding_text(finding) -> str:
    """Extract plain text from a FindingItem or str."""
    if hasattr(finding, "statement"):
        return finding.statement
    return str(finding)
