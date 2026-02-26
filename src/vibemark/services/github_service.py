"""GitHub service — OAuth flow + GitHub API for repo scanning."""

from __future__ import annotations

import json
import os

import httpx

GITHUB_AUTH_URL = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_API = "https://api.github.com"


def get_client_id() -> str:
    return os.environ.get("GITHUB_CLIENT_ID", "")


def get_client_secret() -> str:
    return os.environ.get("GITHUB_CLIENT_SECRET", "")


def get_auth_url(redirect_uri: str = "http://localhost:3000/auth/github/callback") -> str:
    """Build the GitHub OAuth authorization URL."""
    client_id = get_client_id()
    if not client_id:
        raise ValueError("GITHUB_CLIENT_ID environment variable not set")
    return (
        f"{GITHUB_AUTH_URL}"
        f"?client_id={client_id}"
        f"&redirect_uri={redirect_uri}"
        f"&scope=repo"
    )


def exchange_code(code: str) -> str:
    """Exchange an OAuth code for an access token."""
    client_id = get_client_id()
    client_secret = get_client_secret()
    if not client_id or not client_secret:
        raise ValueError("GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET must be set")

    resp = httpx.post(
        GITHUB_TOKEN_URL,
        json={
            "client_id": client_id,
            "client_secret": client_secret,
            "code": code,
        },
        headers={"Accept": "application/json"},
    )
    resp.raise_for_status()
    data = resp.json()
    token = data.get("access_token")
    if not token:
        raise ValueError(f"GitHub OAuth error: {data.get('error_description', 'unknown')}")
    return token


def get_user(token: str) -> dict:
    """Get the authenticated GitHub user."""
    resp = httpx.get(
        f"{GITHUB_API}/user",
        headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"},
    )
    resp.raise_for_status()
    return resp.json()


def list_repos(token: str) -> list[dict]:
    """List repos the user has access to."""
    repos = []
    page = 1
    while True:
        resp = httpx.get(
            f"{GITHUB_API}/user/repos",
            params={"per_page": 100, "page": page, "sort": "updated"},
            headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"},
        )
        resp.raise_for_status()
        batch = resp.json()
        if not batch:
            break
        repos.extend(batch)
        page += 1
        if len(batch) < 100:
            break
    return repos


def get_file_content(token: str, repo_full_name: str, path: str) -> str | None:
    """Fetch a file's content from a GitHub repo."""
    resp = httpx.get(
        f"{GITHUB_API}/repos/{repo_full_name}/contents/{path}",
        headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github.raw+json"},
    )
    if resp.status_code == 404:
        return None
    resp.raise_for_status()
    return resp.text


def get_repo_info(token: str, repo_full_name: str) -> dict:
    """Get repository metadata."""
    resp = httpx.get(
        f"{GITHUB_API}/repos/{repo_full_name}",
        headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"},
    )
    resp.raise_for_status()
    return resp.json()


def scan_repo(token: str, repo_full_name: str) -> dict:
    """Scan a GitHub repo and return raw content for the scan service.

    Returns a dict with readme, package_json, pyproject_toml, and repo metadata.
    """
    from vibemark.services.scan_service import scan_from_raw_content

    repo_info = get_repo_info(token, repo_full_name)

    readme = get_file_content(token, repo_full_name, "README.md")
    pkg_raw = get_file_content(token, repo_full_name, "package.json")
    pyproj_raw = get_file_content(token, repo_full_name, "pyproject.toml")

    package_json = None
    if pkg_raw:
        try:
            package_json = json.loads(pkg_raw)
        except json.JSONDecodeError:
            pass

    pyproject_toml = None
    if pyproj_raw:
        try:
            import sys
            if sys.version_info >= (3, 11):
                import tomllib
            else:
                try:
                    import tomllib
                except ImportError:
                    import tomli as tomllib  # type: ignore[no-redef]
            pyproject_toml = tomllib.loads(pyproj_raw)
        except Exception:
            pass

    profile = scan_from_raw_content(
        readme=readme or "",
        package_json=package_json,
        pyproject_toml=pyproject_toml,
        repo_name=repo_info.get("name", ""),
        description=repo_info.get("description", "") or "",
        language=repo_info.get("language", "") or "",
        license_name=(repo_info.get("license") or {}).get("spdx_id", ""),
    )
    profile.repo_url = repo_info.get("html_url", "")

    return profile.model_dump()
