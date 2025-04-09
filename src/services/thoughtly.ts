

// Additional method to get a single lead
retrieveLead: async (id: number) => {
  try {
    const response = await fetch(`https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/thoughtly-get-contact?id=${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error(`Error fetching lead: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error retrieving lead:', error);
    throw error;
  }
},
