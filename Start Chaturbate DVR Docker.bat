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
