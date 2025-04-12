
// Update handlePdfDrop method
const handlePdfDrop = async (file: File) => {
  if (!id || !file) return;
  
  try {
    const uniqueFileName = `${Date.now()}_${file.name}`;
    const fileType = guessDocumentType(file.name);
    
    toast.info(`Analyzing ${fileType || 'document'}: ${file.name}...`);
    
    // Upload file to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('borrower-documents')
      .upload(`leads/${id}/${uniqueFileName}`, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Error uploading document: ${uploadError.message}`);
    }
    
    // Get public URL for the uploaded file
    const { data: { publicUrl } } = supabase.storage
      .from('borrower-documents')
      .getPublicUrl(`leads/${id}/${uniqueFileName}`);
    
    // Analyze PDF using edge function
    const { data, error } = await supabase.functions.invoke('analyze-pdf-document', {
      body: { 
        fileUrl: publicUrl, 
        fileType: fileType,
        leadId: id
      }
    });
    
    if (error) {
      console.error('Analysis error:', error);
      throw new Error(`Error analyzing document: ${error.message}`);
    }
    
    // Refresh loan application data after successful analysis
    await fetchLoanApplicationData(id);
    
    // Display success toast with document type and details
    toast.success(`Successfully analyzed ${fileType || 'document'}!`, {
      description: `Extracted data from ${file.name}`
    });
    
  } catch (error) {
    console.error('Document processing error:', error);
    toast.error(`Failed to process document: ${error instanceof Error ? error.message : 'Unknown error'}`, {
      description: 'Please try uploading the document again'
    });
  }
};
