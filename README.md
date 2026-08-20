# 🚀 Jerney — Production DevSecOps & GitOps Project

> [!IMPORTANT]
> **Branch Execution Note:** Please execute the deployment steps using the **`devops`** branch. The code examples, line references, and inline comment configurations provided throughout this README are tailored specifically to the `devops` branch workflows.

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

### 🧰 Step 1: EC2 Workstation Setup & Tool Installation

Run all commands below to prepare your management workstation:

```bash
# Update System Dependencies
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl unzip git apt-transport-https ca-certificates gnupg lsb-release

# Install Terraform
wget -O- "https://apt.releases.hashicorp.com/gpg" | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install -y terraform

# Install AWS CLI v2
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Install Docker & Enable Permissions
sudo apt install -y docker.io docker-compose-v2
sudo usermod -aG docker $USER
newgrp docker

```

---

### 🏗️ Step 2: Provision AWS Infrastructure via Terraform

Clone the repository and provision the AWS EKS Cluster alongside VPC and IAM configurations:

```bash
# Clone Repository
git clone https://github.com/sanjayleo35/Jerney.git
cd Jerney/terraform

# Initialize & Apply Terraform Configuration
terraform init
terraform plan
terraform apply --auto-approve

# Connect kubectl to EKS Cluster
aws eks update-kubeconfig --region us-east-1 --name jerney-eks
kubectl get nodes

```
---

### 🐳 Step 3: Local Testing, Containerization & GHCR Push

```bash
# 1. Test Application via Docker Compose
cd ~/Jerney
docker compose up -d
docker ps

# 2. Authenticate with GitHub Container Registry (GHCR)
echo "YOUR_GITHUB_PAT" | docker login ghcr.io -u sanjayleo35 --password-stdin

# 3. Tag and Push Docker Images
docker tag jerney-backend:latest ghcr.io/sanjayleo35/jerney-backend:latest
docker tag jerney-frontend:latest ghcr.io/sanjayleo35/jerney-frontend:latest

docker push ghcr.io/sanjayleo35/jerney-backend:latest
docker push ghcr.io/sanjayleo35/jerney-frontend:latest
```

---

### 🐙 Step 4: Install Argo CD on EKS Cluster

```bash
# 1. Install Argo CD Components
kubectl create namespace argo-cd
kubectl apply -n argo-cd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# 2. Expose Argo CD Server via NodePort
kubectl patch svc argocd-server -n argo-cd -p '{"spec": {"type": "NodePort"}}'

# 3. Retrieve Initial Admin Password
kubectl -n argo-cd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d; echo

```

---

### 🔒 Step 5: Grant Argo CD Cluster Admin RBAC Permissions

If Argo CD fails to discover or list cluster-scoped resources (`ConfigMaps`, `Nodes`), grant elevated permissions to the controller:

```bash
# Create ClusterRoleBinding for Argo CD Controller
kubectl create clusterrolebinding argocd-application-controller-admin \
  --clusterrole=cluster-admin \
  --serviceaccount=argo-cd:argocd-application-controller

# Restart Argo CD StatefulSet
kubectl rollout restart statefulset argocd-application-controller -n argo-cd
kubectl rollout status statefulset argocd-application-controller -n argo-cd

```

---

### 🔄 Step 6: Deploy Application via Argo CD (GitOps)

```bash
# 1. Deploy Argo CD Application Manifest
kubectl apply -f argocd-app.yaml -n argo-cd

# 2. Force Hard Refresh & Trigger Sync
kubectl patch app jerney-app -n argo-cd --type merge -p '{"metadata": {"annotations": {"argocd.argoproj.io/refresh": "hard"}}}'
kubectl patch app jerney-app -n argo-cd --type merge -p '{"operation": {"sync": {"prune": true}}}'

# 3. Verify Deployed Kubernetes Resources
kubectl get all,pvc,ingress -n jerney
```

---

### 🧹 Step 7: Complete Tear Down (Prevent Cloud Charges)

Follow this exact sequence to delete all cluster resources, load balancers, and active infrastructure:

```bash
# 1. Delete Argo CD Application & Namespaces
kubectl delete app jerney-app -n argo-cd
kubectl delete -f k8s/ -n jerney --ignore-not-found
kubectl delete ns jerney argo-cd --ignore-not-found

# 2. Destroy AWS Infrastructure via Terraform
cd ~/Jerney/terraform
terraform destroy --auto-approve
```