variable "aws_region" {
  description = "Región del bucket S3 del front."
  type        = string
  default     = "us-east-1"
}

variable "domain_name" {
  description = "Dominio raíz desde el que se sirve el front (y las rutas del API)."
  type        = string
  default     = "itmentorsoft.com"
}

variable "bucket_name" {
  description = "Nombre del bucket S3 (privado) con el build de Angular. Debe ser único a nivel global."
  type        = string
  default     = "itmentorsoft-front-web"
}

variable "api_origin_domain" {
  description = <<-EOT
    Dominio del API Gateway, sin protocolo (ej. abc123.execute-api.us-east-1.amazonaws.com).
    Vacío = CloudFront solo sirve el front y no enruta el API todavía.
  EOT
  type        = string
  default     = ""
}

variable "api_origin_path" {
  description = "Prefijo del stage en API Gateway (ej. /prod). Vacío para el stage $default."
  type        = string
  default     = ""
}

variable "api_path_prefixes" {
  description = "Prefijos de rutas que CloudFront envía al API."
  type        = list(string)
  default     = ["/users", "/assessments", "/content", "/reports"]
}

variable "github_repository" {
  description = "Repositorio de GitHub (owner/repo) autorizado a desplegar por OIDC."
  type        = string
  default     = "devgalop/itmentorsoft-front"
}

variable "github_repository_with_ids" {
  description = <<-EOT
    Repositorio como lo emite GitHub en el claim "sub" del token OIDC, con los IDs
    numéricos del dueño y del repo (owner@ownerId/repo@repoId).
    Se ve en los claims del job: sub = repo:<este valor>:ref:refs/heads/<rama>.
  EOT
  type        = string
  default     = "devgalop@103542712/itmentorsoft-front@1256635525"
}

variable "github_deploy_branch" {
  description = "Rama desde la que el workflow puede asumir el rol de despliegue."
  type        = string
  default     = "master"
}

variable "create_github_oidc_provider" {
  description = "false si la cuenta ya tiene un proveedor OIDC de GitHub (solo se permite uno por cuenta)."
  type        = bool
  default     = true
}
