import { supabase } from './src/lib/supabase';
import { getOrganizationId } from './src/lib/orgService';

async function test() {
  try {
     const orgId = await getOrganizationId();
     const { data, error } = await supabase.from('requirements').upsert({
        id: 'test-id-1234',
        title: 'test',
        description: 'test',
        status: 'backlog',
        priority: 'medium',
        source: 'customer',
        organization_id: orgId,
        serial_number: 'req-001',
        project_id: null,
        link_url: 'http://example.com',
        customer_name: 'test',
        internal_source_detail: 'abc',
        submitter_id: 'user1',
        assignee_id: 'user2',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted: false,
        deleted_at: null
     });
     if (error) {
       console.log("Error inserting:", error);
     } else {
       console.log("Success inserting requirements with all fields");
     }
  } catch (e) {
     console.log("Fatal Error:", e);
  }
}
test();
