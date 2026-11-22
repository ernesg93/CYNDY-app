import json
import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]


class ReleaseConfigTests(unittest.TestCase):
    def test_initial_release_and_pre_major_policy(self):
        config = json.loads((ROOT / 'release-please-config.json').read_text())
        manifest = json.loads((ROOT / '.release-please-manifest.json').read_text())
        self.assertEqual(manifest, {})
        self.assertEqual(config['bootstrap-sha'], '69391483460502edc68c2b5747b8f474ab65ac68')
        self.assertTrue(config['bump-minor-pre-major'])
        self.assertEqual(config['packages']['app']['release-type'], 'node')
        self.assertEqual(config['packages']['app']['release-as'], '0.1.0')

    def test_workflow_requires_explicit_enable_and_app_credentials(self):
        workflow = (ROOT / '.github/workflows/release-please.yml').read_text()
        self.assertIn("vars.RELEASE_PLEASE_ENABLED == 'true'", workflow)
        self.assertIn('actions/create-github-app-token@f418cff399f7aef4c2f0ad47e25ca7a6abbdd6fc', workflow)
        self.assertIn('googleapis/release-please-action@45996ed1f6d02564a971a2fa1b5860e934307cf7', workflow)
        self.assertIn('client-id: ${{ vars.RELEASE_PLEASE_CLIENT_ID }}', workflow)
        self.assertIn('secrets.RELEASE_PLEASE_APP_PRIVATE_KEY', workflow)
        self.assertIn('steps.app-token.outputs.token', workflow)
        self.assertIn('skip-github-release: true', workflow)
        self.assertNotIn('pull_request_target:', workflow)


if __name__ == '__main__':
    unittest.main()
