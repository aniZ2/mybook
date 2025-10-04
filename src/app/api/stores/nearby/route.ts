export async function GET(){
  return new Response(JSON.stringify({ stores: [] }), { headers: { 'content-type':'application/json' } });
}
