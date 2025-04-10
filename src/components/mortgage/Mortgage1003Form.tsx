
// Update the push to pipeline button
<Button 
  type="button" 
  variant="dialer" 
  className="bg-crm-blue hover:bg-crm-blue/90 
    transition-all duration-300 
    shadow-lg shadow-blue-500/50 
    hover:shadow-blue-500/70 
    animate-pulse-glow" 
  onClick={handlePushToPipeline} 
  disabled={pushingToPipeline}
>
  {pushingToPipeline ? "Pushing to Pipeline..." : "Push to Pipeline"}
</Button>
