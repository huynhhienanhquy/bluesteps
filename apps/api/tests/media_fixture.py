"""Small real encoded test video; no recorded person, microphone or remote asset."""

import io

import av


def video_bytes(format: str = "webm") -> bytes:
    output = io.BytesIO()
    with av.open(output, "w", format=format) as container:
        stream = container.add_stream("libvpx" if format == "webm" else "libx264", rate=5)
        stream.width, stream.height, stream.pix_fmt = 160, 120, "yuv420p"
        container.metadata["title"] = "private fixture metadata"
        for index in range(5):
            frame = av.VideoFrame(160, 120, "yuv420p")
            for plane in frame.planes:
                plane.update(bytes([100 + index * 10 if plane == frame.planes[0] else 128]) * plane.buffer_size)
            frame.pts = index
            for packet in stream.encode(frame):
                container.mux(packet)
        for packet in stream.encode():
            container.mux(packet)
    return output.getvalue()
