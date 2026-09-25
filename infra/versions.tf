terraform {
  required_version = ">= 1.10"

  # Estado remoto. El bucket se creó a mano (no lo gestiona este Terraform).
  backend "s3" {
    bucket       = "itmentorsoft-terraform-state-137972146097"
    key          = "front/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# CloudFront solo acepta certificados ACM emitidos en us-east-1.
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}
