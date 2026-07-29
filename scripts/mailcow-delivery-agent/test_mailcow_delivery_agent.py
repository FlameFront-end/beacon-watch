import unittest

from mailcow_delivery_agent import canonical_json, delivery_result, error_category


class MailcowDeliveryAgentTests(unittest.TestCase):
    def test_canonical_json_sorts_keys(self):
        self.assertEqual(canonical_json({"b": 2, "a": 1}), '{"a":1,"b":2}')

    def test_sent_event_is_delivered(self):
        self.assertEqual(delivery_result("queue: to=<a@b>, status=sent"), ("delivered", None))

    def test_tls_deferred_is_classified(self):
        line = "queue: status=deferred (TLS is required)"
        self.assertEqual(delivery_result(line), ("deferred", "tls_error"))
        self.assertEqual(error_category(line), "tls_error")


if __name__ == "__main__":
    unittest.main()
