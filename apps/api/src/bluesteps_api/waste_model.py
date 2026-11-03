"""Inference architecture from thuannn18022005/uiux1, cell 9 (Kaggle version 3).

Keep forward operations identical to training, including tanh and sigma=0.5.
https://www.kaggle.com/code/thuannn18022005/uiux1
"""

from typing import cast

import torch
from torch import Tensor, nn
from torch.nn import functional as F
from torchvision.models import efficientnet_b0  # type: ignore[import-untyped]


class FastKANLayer(nn.Module):
    grid: Tensor

    def __init__(self, input_dim: int, output_dim: int, grid_size: int = 8, sigma: float = 0.5):
        super().__init__()
        self.sigma = sigma
        self.register_buffer("grid", torch.linspace(-1, 1, grid_size))
        self.base = nn.Linear(input_dim, output_dim)
        self.spline_weight = nn.Parameter(torch.randn(output_dim, input_dim, grid_size) * 0.01)

    def forward(self, x: Tensor) -> Tensor:
        rbf = torch.exp(-((x.unsqueeze(-1) - self.grid) ** 2) / (2 * self.sigma**2))
        return cast(Tensor, self.base(x) + torch.einsum("big,oig->bo", rbf, self.spline_weight))


class FastKAN(nn.Module):
    def __init__(self, layers_hidden: list[int]):
        super().__init__()
        self.layers = nn.ModuleList(
            [
                FastKANLayer(in_dim, out_dim)
                for in_dim, out_dim in zip(layers_hidden[:-1], layers_hidden[1:], strict=True)
            ]
        )

    def forward(self, x: Tensor) -> Tensor:
        for layer in self.layers[:-1]:
            x = F.silu(layer(x))
        return cast(Tensor, self.layers[-1](x))


class EfficientNetB0FastKAN(nn.Module):
    def __init__(self, num_classes: int = 10):
        super().__init__()
        # The supplied checkpoint already contains all backbone weights. No downloads.
        backbone = efficientnet_b0(weights=None)
        self.features = backbone.features
        self.avgpool = backbone.avgpool
        self.feature_norm = nn.LayerNorm(1280)
        self.dropout = nn.Dropout(p=0.2)
        self.fastkan = FastKAN([1280, 256, num_classes])

    def forward(self, x: Tensor) -> Tensor:
        x = self.features(x)
        x = torch.flatten(self.avgpool(x), 1)
        x = torch.tanh(self.feature_norm(x))
        return cast(Tensor, self.fastkan(self.dropout(x)))
