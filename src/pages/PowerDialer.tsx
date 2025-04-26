
// Replace the "success" variant with "default"
<Badge variant={connectedLeadData ? "default" : "outline"}>
  {connectedLeadData ? "Lead Data Present" : "No Lead Data"}
</Badge>
