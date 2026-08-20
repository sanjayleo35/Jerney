# 🚀 Jerney — Production DevSecOps & GitOps Project

Jerney is a multi-service modern microservices blogging platform deployed on **AWS EKS (Elastic Kubernetes Service)** using **Terraform** for Infrastructure as Code (IaC), **Docker** & **GitHub Container Registry (GHCR)** for image management, and **Argo CD** for declarative GitOps continuous deployment.

---

## 🛠️ Architecture & Tech Stack

* **Cloud Infrastructure:** AWS (EKS, VPC, Subnets, EC2, IAM)
* **Infrastructure as Code (IaC):** Terraform
* **Containerization & Registry:** Docker, Docker Compose, GitHub Container Registry (GHCR)
* **Orchestration & Deployments:** Kubernetes (`kubectl`), Argo CD (GitOps)
* **Application Stack:** Node.js (Backend), Nginx / React (Frontend), PostgreSQL (Database)

---

## 📋 Comprehensive Deployment Workflow

[ Local / EC2 Setup ] ──> [ Terraform AWS EKS ] ──> [ Docker Build & Push GHCR ] ──> [ Argo CD GitOps Sync ] ──> [ Live Application ]

---

## 🧰 Step 1: EC2 & CLI Setup

Launch an Ubuntu EC2 Instance (`t3.micro` or `t3.medium`) to serve as your management workstation.

### 1. Update System & Install Dependencies
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl unzip git apt-transport-https ca-certificates gnupg lsb-release

2. Install Terraform

wget -O- [https://apt.releases.hashicorp.com/gpg](https://apt.releases.hashicorp.com/gpg) | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] [https://apt.releases.hashicorp.com](https://apt.releases.hashicorp.com) $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install -y terraform

3. Install AWS CLI v2

curl "[https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip](https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip)" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
aws --version

4. Install kubectl

curl -LO "[https://dl.k8s.io/release/$(curl](https://dl.k8s.io/release/$(curl) -L -s [https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl](https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl)"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
kubectl version --client

5. Install Docker & Docker Compose

sudo apt install -y docker.io docker-compose-v2
sudo usermod -aG docker $USER
newgrp docker

🏗️ Step 2: Provision AWS Infrastructure via Terraform
Clone the repository and provision the AWS EKS Cluster alongside VPC and IAM configurations.

# Clone Repository
git clone [https://github.com/sanjayleo35/Jerney.git](https://github.com/sanjayleo35/Jerney.git)
cd Jerney/terraform

# Initialize & Apply Terraform Configuration
terraform init
terraform plan
terraform apply --auto-approve

Connect kubectl to EKS Cluster
Once Terraform completes successfully, configure your local Kubernetes context:

aws eks update-kubeconfig --region us-east-1 --name jerney-eks
kubectl get nodes

🐳 Step 3: Local Testing, Containerization & GHCR Push
1. Test Application via Docker Compose

cd ~/Jerney
docker compose up -d
docker ps

2. Authenticate with GitHub Container Registry (GHCR)
Create a GitHub Personal Access Token (PAT) with write:packages scope and log in:

echo "YOUR_GITHUB_PAT" | docker login ghcr.io -u sanjayleo35 --password-stdin

3. Tag and Push Docker Images

# Tag Backend and Frontend
docker tag jerney-backend:latest ghcr.io/sanjayleo35/jerney-backend:latest
docker tag jerney-frontend:latest ghcr.io/sanjayleo35/jerney-frontend:latest

# Push Images to GHCR
docker push ghcr.io/sanjayleo35/jerney-backend:latest
docker push ghcr.io/sanjayleo35/jerney-frontend:latest

🐙 Step 4: Install Argo CD on EKS Cluster
1. Install Argo CD Components

kubectl create namespace argo-cd
kubectl apply -n argo-cd -f [https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml](https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml)

2. Expose Argo CD Server via NodePort / Port Forwarding

kubectl patch svc argocd-server -n argo-cd -p '{"spec": {"type": "NodePort"}}'

3. Retrieve Initial Admin Password

kubectl -n argo-cd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d; echo

🔒 Step 5: Grant Argo CD Cluster Admin RBAC Permissions
If Argo CD fails to discover or list cluster-scoped resources (ConfigMaps, Nodes), grant the argocd-application-controller service account elevated cluster privileges:

# Create ClusterRoleBinding for Argo CD Controller
kubectl create clusterrolebinding argocd-application-controller-admin \
  --clusterrole=cluster-admin \
  --serviceaccount=argo-cd:argocd-application-controller

# Restart Argo CD StatefulSet to apply RBAC permissions
kubectl rollout restart statefulset argocd-application-controller -n argo-cd
kubectl rollout status statefulset argocd-application-controller -n argo-cd

🔄 Step 6: Deploy Application via Argo CD (GitOps)
1. Deploy Argo CD Application Manifest
Ensure your argocd-app.yaml points to your GitHub repository and devops branch:

kubectl apply -f argocd-app.yaml -n argo-cd

2. Force Hard Refresh & Trigger Sync
If Argo CD displays a cached state or needs an immediate re-sync:

# Hard Refresh Annotation
kubectl patch app jerney-app -n argo-cd --type merge -p '{"metadata": {"annotations": {"argocd.argoproj.io/refresh": "hard"}}}'

# Trigger Sync
kubectl patch app jerney-app -n argo-cd --type merge -p '{"operation": {"sync": {"prune": true}}}'

3. Verify Deployed Kubernetes Resources

kubectl get all,pvc,ingress -n jerney

🧹 Step 7: Complete Tear Down (Prevent Cloud Charges)
Once testing or portfolio snapshot creation is complete, follow this exact sequence to prevent ongoing AWS billing (EKS control plane, NAT Gateways, EBS volumes):

# 1. Delete Argo CD Application & Application Namespaces
kubectl delete app jerney-app -n argo-cd
kubectl delete -f k8s/ -n jerney --ignore-not-found
kubectl delete ns jerney argo-cd --ignore-not-found

# 2. Destroy AWS Infrastructure via Terraform
cd ~/Jerney/terraform
terraform destroy --auto-approve

📌 Handy Verification Commands Quick Reference

Action	Command
Check EKS Nodes	kubectl get nodes
Check Argo CD Pods	kubectl get pods -n argo-cd
Check App Workloads	kubectl get pods -n jerney
Check Remote Branches	git ls-remote --heads https://github.com/sanjayleo35/Jerney.git
Restart Application Deployment	kubectl rollout restart deployment jerney-backend -n jerney