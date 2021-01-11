FROM python:3.9

RUN pip3 install poetry
WORKDIR /app
COPY . /app
RUN poetry install

EXPOSE 80
ENTRYPOINT poetry run uvicorn main:app --host 0.0.0.0 --port 80 --proxy-headers
