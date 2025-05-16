Fork of https://github.com/teacat/chaturbate-dvr/tree/master/chaturbate

Features
- Compact list view
- Click item to expand/collapse
- Items are sorted by name, grouped by status ( atm. requires manual refresh )
- Input takes whole CB url, will filter the ID automatically.



Docker Image on Docker Hub: lilbandit/chaturbate-dvr

Run from commandline:
docker run -d --name lilbandit-cb-dvr -p 8080:8080 -v C:\my_recordings:/usr/src/app/videos -v C:\my_config:/usr/src/app/conf lilbandit/chaturbate-dvr
