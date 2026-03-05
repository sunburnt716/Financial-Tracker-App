import cv2
import numpy as np

class ImagePipeline:
    def __init__(self, img):
        self.img = img

    def to_grayscale(self):
        """
        Converts image to grayscale.
        """
        if len(self.img.shape) == 3:
            self.img = cv2.cvtColor(self.img, cv2.COLOR_BGR2GRAY)
        return self

    def denoise(self):
        """
        Applies Bilateral Filtering to remove noise while preserving edges
        """
        self.img = cv2.bilateralFilter(self.img, 9, 75, 75)
        return self

    def deskew(self):
        """
        Applies deskewing to correct the orientation of the image.
        """
        threshold = cv2.threshold(self.img, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1]

        coords = np.column_stack(np.where(threshold > 0))

        angle = cv2.minAreaRect(coords)[-1]

        if angle < -45:
            angle = -(90 + angle)
        else:
            angle = -angle

        (h, w) = self.img.shape[:2]
        center = (w // 2, h // 2)
        M = cv2.getRotationMatrix2D(center, angle, 1.0)
        self.img = cv2.warpAffine(self.img, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)

        return self
    
    def binarize(self):
        """
        Applies Otsu's thresholding to binarize the image.
        """
        self.img = cv2.threshold(self.img, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]
        return self
    
    def run_pipeline(self):
        """
        Chain the logic together.
        """
        return (self.to_grayscale()
                .denoise()
                .deskew()
                .binarize()
                .img)
    