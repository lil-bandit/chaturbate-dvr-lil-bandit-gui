Fork of excellent work by TeaCat+
<br>https://github.com/teacat/chaturbate-dvr/tree/master/chaturbate

Changes
=============================
- More compact list view (Click to expand/collaps)
- Added thumbnail support ( Put you own JPGs in <config_dir>/channel-images/<channel_name>.jpg <--  )
- List is automatically sorted by name and grouped by <i>status</i>
- Added Maximum Connections option
- Added Channel Priority option ( if Maximum Connections is set )
- Added Edit button for channels
- Fixed "Auto-Update & Scroll Logs" ( Item will still update, but only the log output will be disabled )
- Input takes whole CB URL and will filter the ID automatically.
- Insert current browsers User-Agent. Small time-saver; if you are using the same browser as for the webgui, user-agent will be the same.
- Misc. UI changes 

Note: Nothing is changed in regards to CloudFlare blocks.

---------------------------------------------

Download Windows Binary
=============================
https://github.com/lil-bandit/chaturbate-dvr/releases


Using Docker - Example
=============================

Start Chaturbate DVR Docker.bat
(This will previous version and install and run latest)
After this you should be able to go to localhost:8080

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
