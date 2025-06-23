rem  # Stops and removes the container and image if it exists 
docker stop chaturbate-dvr-lb
docker rm chaturbate-dvr-lb
docker rmi lilbandit/chaturbate-dvr 

rem  # Download the latest image
docker pull lilbandit/chaturbate-dvr  

rem  # Create and run new container ( Edit to match desired paths on your system )
docker run -d ^
  --name chaturbate-dvr-lb ^
  -p 8080:8080 ^
  -v C:\temp\dvr_videos:/usr/src/app/videos ^
  -v C:\temp\dvr_config:/usr/src/app/conf ^
  lilbandit/chaturbate-dvr ^
  -domain "https://chaturbate.com/" ^
  -interval 1 ^
  -max-connections 10 ^
