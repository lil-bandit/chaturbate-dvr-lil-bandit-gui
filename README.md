Fork of excellent work by TeaCat+
<br>https://github.com/teacat/chaturbate-dvr/tree/master/chaturbate

Changes
=============================
- More compact list view (Click to expand/collapse)
- Added thumbnail support ( Put your own JPGs in <config_dir>/channel-images/<channel_name>.jpg <--  )
- List is automatically sorted by name and grouped by <i>status</i>
- Added Maximum Connections option
- Added Channel Priority option ( if Maximum Connections is set )
- Added Edit button for channels
- Fixed "Auto-Update & Scroll Logs" ( Item will still update, but only the log output will be disabled )
- Input takes whole CB URL and will filter the ID automatically.
- Insert current browsers User-Agent. Small time-saver; if you are using the same browser as for the webgui, user-agent will be the same.
- Misc. UI changes 

- API additions
  - //localhost:8080/api/channel/:username <-- gets all info and status of a channel
  - //localhost:8080/api/channels  <-- gets info and status of <i>all</i> channels

<br>

Note: Nothing is changed in regards to CloudFlare blocks.


---------------------------------------------

Download Windows Binary
=============================
https://github.com/lil-bandit/chaturbate-dvr/releases


---------------------------------------------

Docker Image 
=============================
1. Install <a href="https://www.docker.com/products/docker-desktop/">Docker Desktop</a> for <u>Windows</u>
2. Download image and run Chaturbate DVR LB container --> Put the following script in a <a href="https://github.com/lil-bandit/chaturbate-dvr/releases/tag/docker-helper">batfile</a> and run it<br> 



<pre>
:: Stop and unload if already running
docker stop chaturbate-dvr-lb
docker rm chaturbate-dvr-lb

:: Remove the image
docker rmi lilbandit/chaturbate-dvr

:: Download latest image
docker pull lilbandit/chaturbate-dvr  

:: Create container with arguments and run (Change)
docker run -d ^
  --name chaturbate-dvr-lb ^
  -p 8080:8080 ^
  -v C:\temp\dvr_videos:/usr/src/app/videos ^
  -v C:\temp\dvr_config:/usr/src/app/conf ^
  lilbandit/chaturbate-dvr ^
  -domain "https://chaturbate.com/" ^
  -interval 1 ^
  -max-connections 10
</pre>
⚠️<b>NOTE:</b> Make sure the folderpaths are pointing to desired directories on your system.

<pre>
Change:
  
C:\temp\dvr_videos
C:\temp\dvr_config

..to folders on your system
</pre>

After editing and running the BATfile, you should be able to go to http://localhost:8080 
