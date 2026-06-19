const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  try {
    const { httpMethod, path, body } = event;
    const highlights = body ? JSON.parse(body) : {};

    // GET /api/highlights - Get all highlights
    if (httpMethod === 'GET') {
      const { data, error } = await supabase
        .from('highlights')
        .select('*');

      if (error) throw error;

      // Transform to object format: { section: [highlights] }
      const result = {};
      if (data) {
        data.forEach(row => {
          if (!result[row.section]) {
            result[row.section] = [];
          }
          result[row.section].push({
            text: row.text,
            color: row.color,
            note: row.note || ''
          });
        });
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result)
      };
    }

    // POST /api/highlights - Save all highlights (replace all)
    if (httpMethod === 'POST') {
      // Delete all existing highlights first
      const { error: deleteError } = await supabase
        .from('highlights')
        .delete()
        .neq('id', 0); // Delete all rows

      if (deleteError) throw deleteError;

      // Insert new highlights
      const rows = [];
      for (const [section, sectionHighlights] of Object.entries(highlights)) {
        for (const h of sectionHighlights) {
          rows.push({
            section,
            text: h.text,
            color: h.color,
            note: h.note || ''
          });
        }
      }

      if (rows.length > 0) {
        const { error: insertError } = await supabase
          .from('highlights')
          .insert(rows);

        if (insertError) throw insertError;
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Highlights saved' })
      };
    }

    // PUT /api/highlights/:section - Update specific section
    if (httpMethod === 'PUT') {
      const section = path.split('/').pop();
      
      // Delete existing highlights for this section
      const { error: deleteError } = await supabase
        .from('highlights')
        .delete()
        .eq('section', section);

      if (deleteError) throw deleteError;

      // Insert new highlights for this section
      if (highlights.length > 0) {
        const rows = highlights.map(h => ({
          section,
          text: h.text,
          color: h.color,
          note: h.note || ''
        }));

        const { error: insertError } = await supabase
          .from('highlights')
          .insert(rows);

        if (insertError) throw insertError;
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: `Highlights for '${section}' updated` })
      };
    }

    // DELETE /api/highlights/:section - Delete section highlights
    if (httpMethod === 'DELETE') {
      const section = path.split('/').pop();

      const { error } = await supabase
        .from('highlights')
        .delete()
        .eq('section', section);

      if (error) throw error;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: `Highlights for '${section}' deleted` })
      };
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Unsupported method' })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Internal server error' })
    };
  }
};
