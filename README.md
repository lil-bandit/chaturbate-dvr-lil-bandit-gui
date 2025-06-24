This is a fork of excellent work by TeaCat+ 

<br>Read general how to's here:
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
- You can now define a directory for completed files (--output-dir <directory name>) - added 2025-06-23 ( With help from misterkoko ) 
- You can now use a preset config (--config <file.json>) - added 2025-06-23 ( With help from misterkoko ) 
- Use persisted settings ( Use the tick box in the server settings dialog ) - added 2025-06-23
- Refresh Thumbnail ( Click on the thumbnail of active channel to get new thumbnail - warning: Images in the browser can be cached, so press CTRL+SHIFT+R to refresh browser+cache )  - added 2025-06-23


- API additions
  - //localhost:8080/api/channel/:username <-- gets all info and status of a channel
  - //localhost:8080/api/channels  <-- gets info and status of <i>all</i> channels

<br>

<b>Note regarding Maximum Connections limit:</b> 
~~1. If you use the GUI to set a limit that is lower than current amount of active downloads,
   then the active downloads will <i>reamain</i> active. You can pause / resume the ones you want to <i>queue</i>.~~  this SHOULD work now.. i think :D 
2. When "replacing" active downloads with higher priority ones, it sometimes takes one "cycle" to reflect the changes ( 1 minute, default ) 



---------------------------------------------

Download Windows Binary
=============================
https://github.com/lil-bandit/chaturbate-dvr/releases


---------------------------------------------

Docker Image 
=============================
1. Install <a href="https://www.docker.com/products/docker-desktop/">Docker Desktop</a> for <u>Windows</u>
2. Download image and run Chaturbate DVR LB container --> Put the following script in a <a href="https://github.com/lil-bandit/chaturbate-dvr/releases/tag/docker-helper">batfile</a> to achieve this<br> 



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
<br>
<br>


![image](https://github.com/user-attachments/assets/84c185cf-3c70-4493-89bb-1ca7fdcce3fc)
