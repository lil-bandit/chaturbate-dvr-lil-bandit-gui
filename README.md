Fork of https://github.com/teacat/chaturbate-dvr/tree/master/chaturbate

Download windows binary: https://github.com/lil-bandit/chaturbate-dvr/releases

Features
- Compact list view
- Misc. UI changes, listitem to expand/collapse, thumbnail
- Items are automatically sorted by name, grouped by status ( atm. requires manual refresh )
- Input takes whole CB url, will filter the ID automatically.
- Small option to insert current browser User-Agent.
- Added Max Connections and priority
- Allow channel edit
---------------------------------------------

Using Docker - Example
=============================

Start Chaturbate DVR Docker.bat

<pre>
docker stop chaturbate-dvr-lb
docker rm chaturbate-dvr-lb
docker rmi lilbandit/chaturbate-dvr  # Removes the image
docker pull lilbandit/chaturbate-dvr  # Downloads the latest image

docker run -d ^
  --name chaturbate-dvr-lb ^
  -p 8080:8080 ^
  -v C:\temp\dvr_videos:/usr/src/app/videos ^
  -v C:\temp\dvr_config:/usr/src/app/conf ^
  lilbandit/chaturbate-dvr ^
  -domain "https://chaturbate.com/" ^
  -interval 1 ^
  -max-connections 10 ^
</pre>

<pre>
Change 
--> C:\temp\dvr_videos
and 
--> C:\temp\dvr_config
to folders on your system
</pre>
