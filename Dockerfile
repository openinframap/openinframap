FROM python:3.9

RUN pip3 install poetry
WORKDIR /app
COPY . /app
RUN poetry install

ENTRYPOINT poetry run uvicorn main:app
