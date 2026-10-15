# Rol que asume GitHub Actions (OIDC, sin claves guardadas) para desplegar el front.

resource "aws_iam_openid_connect_provider" "github" {
  count = var.create_github_oidc_provider ? 1 : 0

  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1", "1c58a3a8518e8759bf075b76b750d4f2df264fcd"]
}

data "aws_iam_openid_connect_provider" "github" {
  count = var.create_github_oidc_provider ? 0 : 1
  url   = "https://token.actions.githubusercontent.com"
}

locals {
  github_oidc_arn = var.create_github_oidc_provider ? aws_iam_openid_connect_provider.github[0].arn : data.aws_iam_openid_connect_provider.github[0].arn

  github_repo_owner = split("/", var.github_repository)[0]
  github_repo_name  = split("/", var.github_repository)[1]

  # GitHub envía el "sub" del token en dos formatos, y el rol acepta ambos:
  #   - clásico:    repo:<dueño>/<repo>:ref:refs/heads/<rama>
  #   - con ids:    repo:<dueño>@<id del dueño>/<repo>@<id del repo>:ref:refs/heads/<rama>
  # Desde octubre de 2026 el repositorio envía el segundo; con solo el clásico, el despliegue
  # falla con "Not authorized to perform sts:AssumeRoleWithWebIdentity".
  github_subjects = compact([
    "repo:${var.github_repository}:ref:refs/heads/${var.github_deploy_branch}",
    var.github_owner_id != "" && var.github_repository_id != "" ? "repo:${local.github_repo_owner}@${var.github_owner_id}/${local.github_repo_name}@${var.github_repository_id}:ref:refs/heads/${var.github_deploy_branch}" : "",
  ])
}

data "aws_iam_policy_document" "github_assume" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [local.github_oidc_arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = local.github_subjects
    }
  }
}

resource "aws_iam_role" "github_deploy" {
  name               = "itmentorsoft-front-deploy"
  assume_role_policy = data.aws_iam_policy_document.github_assume.json
}

data "aws_iam_policy_document" "github_deploy" {
  statement {
    sid       = "SyncBucket"
    actions   = ["s3:PutObject", "s3:DeleteObject", "s3:GetObject"]
    resources = ["${aws_s3_bucket.front.arn}/*"]
  }

  statement {
    sid       = "ListBucket"
    actions   = ["s3:ListBucket"]
    resources = [aws_s3_bucket.front.arn]
  }

  statement {
    sid       = "InvalidateCache"
    actions   = ["cloudfront:CreateInvalidation"]
    resources = [aws_cloudfront_distribution.main.arn]
  }
}

resource "aws_iam_role_policy" "github_deploy" {
  name   = "deploy-front"
  role   = aws_iam_role.github_deploy.id
  policy = data.aws_iam_policy_document.github_deploy.json
}
