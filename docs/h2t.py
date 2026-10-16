import re,html,sys
for f in sys.argv[1:]:
    t=open(f,errors='replace').read()
    t=re.sub(r'(?s)<script.*?</script>|<style.*?</style>','',t);t=html.unescape(re.sub(r'<[^>]+>',' ',t));t=re.sub(r'\s+',' ',t)
    open(f.replace('.html','.txt'),'w').write(t); print(f,len(t))
