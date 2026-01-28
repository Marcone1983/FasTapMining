const {Pool}=require('pg');
require('dotenv').config();
const p=new Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false}});
(async()=>{
try{
const r=await p.query("UPDATE users SET has_lifetime_access=TRUE,lifetime_access_granted_at=NOW() WHERE UPPER(REPLACE(wallet_address,' ',''))='UQARBHBVEIKN4XSWIS30YIRNNGDMOTBBIMBDUGENTEQRPBVIYR' RETURNING telegram_id,username,has_lifetime_access");
console.log(r.rows.length>0?'✅ Owner access: '+JSON.stringify(r.rows[0]):'⚠️ No user found - wallet not connected yet');
}catch(e){console.error('❌',e.message);}
await p.end();
})();
