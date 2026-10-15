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
    Dominio del backend, sin protocolo: el de un API Gateway (ej. abc123.execute-api.us-east-1.amazonaws.com)
    o el DNS público del servidor EC2 (ej. ec2-98-95-193-167.compute-1.amazonaws.com). Debe ser un nombre DNS,
    no una IP. Vacío = CloudFront solo sirve el front y no enruta el API todavía.
  EOT
  type        = string
  default     = ""
}

variable "api_origin_path" {
  description = "Prefijo del stage en API Gateway (ej. /prod). Vacío para el stage $default o para el servidor EC2."
  type        = string
  default     = ""
}

variable "api_origin_protocol" {
  description = <<-EOT
    Cómo habla CloudFront con el backend: "https-only" (API Gateway, por defecto) o "http-only" (servidor EC2
    sin certificado). Con "http-only" el tramo CloudFront -> servidor viaja sin cifrar.
  EOT
  type        = string
  default     = "https-only"

  validation {
    condition     = contains(["https-only", "http-only"], var.api_origin_protocol)
    error_message = "api_origin_protocol debe ser \"https-only\" o \"http-only\"."
  }
}

variable "api_origin_http_port" {
  description = "Puerto HTTP del backend cuando api_origin_protocol es \"http-only\" (la API del servidor EC2 escucha en 8000)."
  type        = number
  default     = 80
}

variable "api_origin_https_port" {
  description = "Puerto HTTPS del backend cuando api_origin_protocol es \"https-only\"."
  type        = number
  default     = 443
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
