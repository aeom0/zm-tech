"""Índices MediaPipe Face Mesh — contorno párpado superior."""

# Ojo izquierdo (lado izquierdo de la imagen)
LEFT_EYE_INNER = 133
LEFT_EYE_OUTER = 33
LEFT_EYE_TOP = 159
LEFT_EYE_BOTTOM = 145

# Arco párpado superior izquierdo (exterior → interior)
LEFT_UPPER_LID = [33, 246, 161, 160, 159, 158, 157, 173, 133]

# Ojo derecho
RIGHT_EYE_INNER = 362
RIGHT_EYE_OUTER = 263
RIGHT_EYE_TOP = 386
RIGHT_EYE_BOTTOM = 374
RIGHT_UPPER_LID = [263, 466, 388, 387, 386, 385, 384, 398, 362]

EYE_PAIRS = (
    ("left", LEFT_EYE_INNER, LEFT_EYE_OUTER, LEFT_EYE_TOP, LEFT_EYE_BOTTOM, LEFT_UPPER_LID),
    ("right", RIGHT_EYE_INNER, RIGHT_EYE_OUTER, RIGHT_EYE_TOP, RIGHT_EYE_BOTTOM, RIGHT_UPPER_LID),
)
