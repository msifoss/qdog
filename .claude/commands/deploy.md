Deploy QDog to production at dakota.membies.com

Read the deployment guide at .claude/deploy.md for connection details.

Deploy steps:
1. First commit and push any pending changes to origin/master
2. SSH to root@dakota.membies.com using key ~/.ssh/id_wiki
3. Run: cd /root/qdog && git pull && docker-compose -f docker-compose.prod.yml up --build -d
4. Verify deployment by checking container logs

Report back the deployment status when complete.
