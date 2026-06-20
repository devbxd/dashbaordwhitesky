const {DatabaseSync}=require('node:sqlite');
const bcrypt=require('bcryptjs');
const db=new DatabaseSync('./db/whitesky.db');
db.prepare("UPDATE users SET username='admin', display_name='Admin' WHERE username='patron'").run();
db.prepare("UPDATE users SET username='user', display_name='User' WHERE username='employe'").run();
db.prepare("UPDATE users SET password=? WHERE username='admin'").run(bcrypt.hashSync('whitesky67758123',10));
db.prepare("UPDATE users SET password=? WHERE username='user'").run(bcrypt.hashSync('whitesky00123',10));
console.log('Done!');