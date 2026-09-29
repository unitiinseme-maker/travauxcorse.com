// Artisan accounts are not part of the current public service. Existing cookies
// and invitation tokens must not grant access to old project data.
module.exports=async function(req,res){
  res.setHeader('Cache-Control','private, no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Set-Cookie','__Host-tc-artisan=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0');
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.statusCode=410;
  res.end(JSON.stringify({error:'Les comptes artisans sont désactivés. Répondez directement au courriel TravauxCorse.'}));
};
