process.env.NODE_TLS_REJECT_UNAUTHORIZED='0';
const {Client}=require('pg');
const fs=require('fs');
const client=new Client({connectionString:'postgresql://avnadmin:AVNS_IX2eMbl1suaif0U6inS@whitesky-db-whiteskyinvoices.l.aivencloud.com:15917/defaultdb?sslmode=require',ssl:{rejectUnauthorized:false}});
async function dump(){
  await client.connect();
  const tables=['users','clients','invoices','invoice_rows','ticket_sales','payments','settings'];
  let sql='';
  for(const t of tables){
    const r=await client.query('SELECT * FROM '+t);
    for(const row of r.rows){
      const cols=Object.keys(row).join(',');
      const vals=Object.values(row).map(v=>{
        if(v===null)return 'NULL';
        if(typeof v==='string')return "'"+v.replace(/'/g,"''")+"'";
        if(typeof v==='boolean')return v?'true':'false';
        return v;
      }).join(',');
      sql+='INSERT INTO '+t+' ('+cols+') VALUES ('+vals+') ON CONFLICT DO NOTHING;\n';
    }
  }
  fs.writeFileSync('dump.sql',sql);
  await client.end();
  console.log('Done! '+sql.split('\n').length+' lignes exportées.');
}
dump().catch(console.error);