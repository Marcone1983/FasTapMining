const {Pool}=require('pg');
require('dotenv').config({path: '/data/data/com.termux/files/home/FasTapMining/.env'});
const p=new Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false}});
(async()=>{
try{
const r=await p.query("UPDATE users SET has_lifetime_access=TRUE, lifetime_access_granted_at=NOW() WHERE UPPER(REPLACE(wallet_address,' ',''))='UQARBHBVEIKN4XSWIS30YIRNNGDMOTBBIMBDUGENTEQRPBVIYR' RETURNING telegram_id,username");
if(r.rows.length>0){console.log('✅ Owner access granted:',r.rows);}
else{console.log('⚠️ No user found with that wallet');}
}catch(e){console.error('❌',e.message);}
await p.end();
})();
