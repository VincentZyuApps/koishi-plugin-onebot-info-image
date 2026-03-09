![koishi-plugin-onebot-info-image](https://socialify.git.ci/VincentZyuApps/koishi-plugin-onebot-info-image/image?custom_description=%E7%94%A8onebot+api%E8%8E%B7%E5%8F%96%E4%B8%80%E4%BA%9B%E4%BF%A1%E6%81%AF%EF%BC%8C%E6%AF%94%E5%A6%82%EF%BC%9A%E7%94%A8%E6%88%B7%E8%AF%A6%E7%BB%86%E4%BF%A1%E6%81%AF%2F%E7%BE%A4%E7%AE%A1%E7%90%86%E5%91%98%E5%88%97%E8%A1%A8%E4%BF%A1%E6%81%AF%2F%E7%BE%A4%E5%85%AC%E5%91%8A%2F%E7%BE%A4%E7%B2%BE%E5%8D%8E%EF%BC%8C%E5%8F%AF%E4%BB%A5%E5%8F%91%E7%BA%AF%E6%96%87%E6%9C%AC%2F%E5%90%88%E5%B9%B6%E8%BD%AC%E5%8F%91%2F%E6%B8%B2%E6%9F%93%E5%9B%BE%E7%89%87%E3%80%82+%E6%8E%A8%E8%8D%90%E5%AF%B9%E6%8E%A5napcat&description=1&font=Bitter&forks=1&issues=1&language=1&logo=https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Ff%2Ff3%2FKoishi.js_Logo.png&name=1&owner=1&pattern=Plus&pulls=1&stargazers=1&theme=Auto)

# koishi-plugin-onebot-info-image

[![npm](https://img.shields.io/npm/v/koishi-plugin-onebot-info-image?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-onebot-info-image)
[![npm-download](https://img.shields.io/npm/dm/koishi-plugin-onebot-info-image?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-onebot-info-image)
[![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/VincentZyuApps/koishi-plugin-onebot-info-image)
[![Gitee](https://img.shields.io/badge/Gitee-C71D23?style=for-the-badge&logo=gitee&logoColor=white)](https://gitee.com/vincent-zyu/koishi-plugin-onebot-info-image)


获取成员信息/管理员列表/群公告/群精华，发送文字/图片/合并转发消息，仅支持onebot

推荐使用[Napcat](https://napneko.github.io/) ![Apifox](https://img.shields.io/badge/Apifox-Napcat文档-blue?logo=apifox)



### 更新日志
- **0.4.0-beta.3+20251230**
  - 整理代码结构，现在支持群精华，群公告
  - 调整部分aui的unknown处理
  - 修改aui的获取groupMemberInfo的判断条件的逻辑
- **0.3.1-beta.1+20251219**
  - 微调flat模板 aui的样式捏
- **0.3.0-beta.1+20251219**
  - 增加配置页面webui里面嵌入的html预览捏
- **0.2.3-beta.1+20251218**
  - 手机号可以强制隐藏捏
- **0.2.2-beta.1+20251218**
  - 新增：aui指令允许使用qq号进行查询
- **前面的版本号**
  - 忘了。反正你看到的features都是前面更新的

#### Napcat平台渲染效果:
##### 用户信息：
![napcat_aui_source](docs/napcat_aui_source.png)
![napcat_aui_lxgw](docs/napcat_aui_lxgw.png)
![napcat_aui_flat](docs/napcat_aui_flat.png)
##### 群管理列表：
![napcat_al_source](docs/napcat_al_source.png)
![napcat_al_lxgw](docs/napcat_al_lxgw.png)
![napcat_al_flat](docs/napcat_al_flat.png)

## dev 
### 查看git大文件
```shell
git rev-list --objects --all | git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | Where-Object { $_ -match '^blob' } | ForEach-Object { $parts = $_ -split ' ', 4; [PSCustomObject]@{ Size = [int]$parts[2]; Name = $parts[3] } } | Sort-Object Size -Descending | Select-Object -First 20 

git rev-list --objects --all | git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | Where-Object { $_ -match '^blob' } | ForEach-Object { $parts = $_ -split ' ', 4; [PSCustomObject]@{ Size = [int]$parts[2]; File = $parts[3] } } | Sort-Object Size -Descending | Select-Object -First 20 | ForEach-Object { "{0,10} KB  {1}" -f ([math]::Round($_.Size/1KB, 2)), $_.File }
```

### 发布到git workflow
#### 开发环境：
```shell
cd G:\GGames\Minecraft\shuyeyun\qq-bot\koishi-dev\koishi-dev-3\external\onebot-info-image
git add .
git commit -m "message"
git push origin main
```
#### 生产环境:
```shell
cd /home/bawuyinguo/SSoftwareFiles/koishi/awa-bot-3/external
git clone https://gitee.com/vincent-zyu/koishi-plugin-onebot-image
cd /home/bawuyinguo/SSoftwareFiles/koishi/awa-bot-3/external/koishi-plugin-onebot-image
git pull
cd /home/bawuyinguo/SSoftwareFiles/koishi/awa-bot-3
yarn && yarn build
yarn
```

### 发布到npm workflow
```shell
# ensure plugin dir name is *onebot-info-image*, without koishi-plugin prefix then:
cd G:\GGames\Minecraft\shuyeyun\qq-bot\koishi-dev\koishi-dev-3
yarn
yarn dev
yarn build onebot-info-image

$Env:HTTP_PROXY = "http://127.0.0.1:7890"
$Env:HTTPS_PROXY = "http://127.0.0.1:7890"
Invoke-WebRequest -Uri "https://www.google.com" -Method Head -UseBasicParsing
npm login --registry https://registry.npmjs.org
# login npm in browser
npm run pub onebot-info-image -- --registry https://registry.npmjs.org
npm dist-tag add koishi-plugin-onebot-info-image@0.4.0-beta.3+20251230 latest --registry https://registry.npmjs.org

npm view koishi-plugin-onebot-info-image
npm-stat.com
```