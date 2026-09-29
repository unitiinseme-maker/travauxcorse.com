// No public client account is offered. Expire any cookie from the old portal.
module.exports=async function(req,res){
  res.setHeader('Cache-Control','private, no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Set-Cookie','__Host-tc-client=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0');
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.statusCode=410;
  res.end(JSON.stringify({error:'Les comptes clients sont désactivés. TravauxCorse traite les demandes par e-mail.'}));
};
