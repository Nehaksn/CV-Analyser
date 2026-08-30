import io
import unittest

from reportlab.pdfgen import canvas

from app import app


class CvReviewUploadTests(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    def test_pdf_upload_is_processed(self):
        pdf_stream = io.BytesIO()
        pdf = canvas.Canvas(pdf_stream)
        pdf.setTitle('Resume')
        pdf.drawString(100, 750, 'Alice Smith')
        pdf.drawString(100, 720, 'Product Manager')
        pdf.drawString(100, 690, 'Experience: Led product strategy and improved growth by 35%.')
        pdf.drawString(100, 660, 'Skills: Python, JavaScript, SQL, Project Management')
        pdf.save()
        pdf_stream.seek(0)

        response = self.client.post(
            '/review',
            data={
                'name': 'Alice Smith',
                'jobTitle': 'Product Manager',
                'cvFile': (pdf_stream, 'resume.pdf')
            },
            content_type='multipart/form-data',
        )

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertIn('analysis', payload)
        self.assertIn('score', payload['analysis'])


if __name__ == '__main__':
    unittest.main()
