from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote
import json,sys
root=Path(__file__).resolve().parent.parent
errors=[];count=0
class Check(HTMLParser):
 def __init__(self):super().__init__();self.h1=0;self.ids=set();self.links=[];self.canonical=0;self.title=0
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=='h1':self.h1+=1
  if tag=='title':self.title+=1
  if a.get('rel')=='canonical':self.canonical+=1
  if 'id'in a:
   if a['id']in self.ids:errors.append(f'{file}: duplicate id {a["id"]}')
   self.ids.add(a['id'])
  if tag=='img' and 'alt'not in a:errors.append(f'{file}: image without alt')
  if tag in ['a','script','link','img']:
   v=a.get('href')or a.get('src')
   if v:self.links.append(v)
for file in root.rglob('index.html'):
 parser=Check();parser.feed(file.read_text());count+=1
 if parser.h1!=1:errors.append(f'{file}: {parser.h1} h1')
 if parser.title!=1 or parser.canonical!=1:errors.append(f'{file}: missing/duplicate SEO metadata')
 for link in parser.links:
  parsed=urlsplit(link)
  if parsed.scheme or parsed.netloc or not parsed.path:continue
  dest=root/unquote(parsed.path).lstrip('/') if parsed.path.startswith('/') else file.parent/unquote(parsed.path)
  if dest.is_dir():dest=dest/'index.html'
  if not dest.exists():errors.append(f'{file}: broken link {link}')
print(json.dumps({'htmlPages':count,'errors':errors},ensure_ascii=False,indent=2));sys.exit(bool(errors))
