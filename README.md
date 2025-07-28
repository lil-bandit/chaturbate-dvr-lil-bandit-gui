This is a fork of excellent work by TeaCat+ 

<br>Read general how to's here:
<br>https://github.com/teacat/chaturbate-dvr/tree/master/chaturbate


The things that has been added or changed.
=============================
- Lower memory consumption in browser keeping the app smooth and reponsive. 
- Autosorted compact list view (Click to expand/collapse)
- Edit channel options in GUI
- Persisting settings ( Use the tick box in the server settings dialog )
- Thumbnail support ( Put your own in <config_dir>/channel-images/<channel_name>.jpg )
- Maximum Connections and priority mechanism ( default 0, is off ) 
- Input takes whole CB URL and will filter the ID automatically.
- "Insert current browsers User-Agent"-button. A small time-saver; if you are using the same browser as for the webgui, user-agent will be the same.
- You can now use a preset config (-config <file.json>) - added 2025-06-23 ( Thanks @misterkoko ) 
- Misc. UI changes and style tweaks

- Added commandline options
  -output-dir <mb> - MOved completed files to a separate directory
  -config <file.json>
  -max-connections <number>
  -min-filesize <mb> - You can set a minimum filesize, anything below it will get deleted

- API additions
  - //localhost:8080/api/channel/\<username\> <-- gets all info and status of a channel
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
2. Download image and run Chaturbate DVR LB container --> Put the following script in a <a href="https://github.com/lil-bandit/chaturbate-dvr/releases/tag/docker-helper">batfile</a> to install image and run as container<br> 



<pre>
:: Stop and unload if already running
docker stop chaturbate-dvr-lb
docker rm chaturbate-dvr-lb

:: Remove the image
docker rmi lilbandit/chaturbate-dvr

:: Download latest image
docker pull lilbandit/chaturbate-dvr

:: Create and run the container
docker run -d ^
  --name chaturbate-dvr-lb ^
  -p 8080:8080 ^
  -v C:\temp\dvr_videos:/usr/src/app/videos ^
  -v C:\temp\dvr_videos_complete:/usr/src/app/complete ^
  -v C:\temp\dvr_config:/usr/src/app/conf ^
  lilbandit/chaturbate-dvr ^
  -domain "https://chaturbate.com/" ^
  -interval 1 ^
  -max-connections 10 ^
  -min-filesize 10 ^
  -output-dir ./complete
  -pattern "videos/{{.Username}}/{{.Username}}_{{.Year}}-{{.Month}}-{{.Day}}_{{.Hour}}-{{.Minute}}-{{.Second}}{{if .Sequence}}_{{.Sequence}}{{end}}"
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




Bonus tips:
=============================

If you just want a comma sperated list of some active channels, 
then go to official cb site and run the following in the console :
<pre>
[...new Set(
  Array.from(document.querySelectorAll('#roomlist_content_wrapper a'))
    .map(a => a.getAttribute('href'))
    .filter(href => href && href.startsWith('/') && !href.includes('?'))
    .map(href => href.replace(/^\/|\/$/g, ''))
)].join(",")
</pre>



