from setuptools import setup, find_packages

setup(
    name="hjs-client",
    version="0.1.0",
    description="Python client for HJS API - A Protocol for Structural Traceability,
    long_description=open("README.md").read(),
    long_description_content_type="text/markdown",
    author="HJS Contributors",
    author_email="signal@humanjudgment.org",
    url="https://github.com/schchit/hjs-api",
    packages=find_packages(),
    install_requires=[
        "requests>=2.25.0",
    ],
    python_requires=">=3.7",
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.7",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
    ],
    keywords="hjs, traceability, structural, judgment, api",
)
