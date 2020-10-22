# mongodb-init-helper



# Environments

## MONGODB_HOST

MongoDB Hostname

## MONGODB_PORT

MongoDB Port

## MONGODB_ADMIN_LOGIN_DB

MongoDB Admin Login DB

default: admin

## MONGODB_ADMIN_USER

MongoDB Admin Login Username

default: *undefined*

## MONGODB_ADMIN_PASS

MongoDB Admin Login Password

default: *undefined*

## MONGODB_ADMIN_AUTH_MECHANISM

MongoDB Admin Login Auth Mechanism

default: *undefined*



# Options

## --pipeline-file=*pipeline json file*

실행할 파이프라인 정의 파일 경로

이를 사용하지 않는 경우 stdin으로 입력해 주어야 함.



# Pipeline

## Inline Function

All values can be replaced with *Inline Function*.

Format: ${*function*[,*type*]:*name*}

### type

* string (default)
* number

### function: Environment

* ${ENV:*environment name*}
* ${ENV,number:*environment name*}

### function: File content

* ${FILE_TEXT:*file path*} : read file with utf-8
* ${FILE_TRIMED:*file path*} : read file with utf-8 and trim whitespaces

## Pipeline Commands

### *common options*

* `_command`: Command Name
* `_ignoreError`: ignore error

### createUser

Details : [db.createUser](https://docs.mongodb.com/manual/reference/method/db.createUser/)

User가 이미 존재해서 오류가 발생할 경우, 해당 오류는 무시함

```json
{
  "_command": "createUser",
  
  "user": "<name>",

  "pwd": "<password>", // OR
  "pwd": {"type": "random", "length": 10},

  "customData": { <any information> },
  
  "roles": [
    { "role": "<role>", "db": "<database>" } | "<role>",
    ...
  ],
  "authenticationRestrictions": [
     {
       "clientSource": ["<IP>" | "<CIDR range>", ...],
       "serverAddress": ["<IP>" | "<CIDR range>", ...]
     },
     ...
  ],
  "mechanisms": [ "<SCRAM-SHA-1|SCRAM-SHA-256>", ... ],
  "passwordDigestor": "<server|client>"
}
```

### grantRolesToUser

Details : [db.grantRolesToUser](https://docs.mongodb.com/manual/reference/method/db.grantRolesToUser/)

```json
{
  "_command": "grantRolesToUser",
  
  "user": "<username>",
  "roles": [ <roles>, ... ],
  "writeConcern": { ... }
}
```



## Helm Example

templates 디렉터리 내에 아래와 같이 sql 정의와 (pre-install) job을 생성하면 helm 설치 시 자동으로 pipeline를 실행할 수 있음.



**mongodb-config.yaml**

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: "{{ .Release.Name }}-mongodb-config"
  labels:
    app.kubernetes.io/managed-by: {{ .Release.Service | quote }}
    app.kubernetes.io/instance: {{ .Release.Name | quote }}
    app.kubernetes.io/version: {{ .Chart.AppVersion }}
    helm.sh/chart: "{{ .Chart.Name }}-{{ .Chart.Version }}"
  annotations:
    "helm.sh/hook": pre-install
    "helm.sh/hook-weight": "-10"
data:
  mongodb-username: test-user-01
  mongodb-password: {{- randAlphaNum 10 | quote -}}
  pipeline.sql: |
    [
      {
        "_command": "createUser",
        "user": "$<FILE_TRIMED:/data/mongodb-username>",
        "pwd": "$<FILE_TRIMED:/data/mongodb-password>",
        "roles": [
          { "role": "readWrite", "db": "test" }
        ],
        "mechanisms": ["SCRAM-SHA-256", "SCRAM-SHA-1"]
      }
    ]
```

**mongodb-setup-job.yaml**

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: "{{ .Release.Name }}-mongodb-setup-job"
  labels:
    app.kubernetes.io/managed-by: {{ .Release.Service | quote }}
    app.kubernetes.io/instance: {{ .Release.Name | quote }}
    app.kubernetes.io/version: {{ .Chart.AppVersion }}
    helm.sh/chart: "{{ .Chart.Name }}-{{ .Chart.Version }}"
  annotations:
    "helm.sh/hook": pre-install
    "helm.sh/hook-weight": "-8"
    "helm.sh/hook-delete-policy": hook-succeeded
spec:
  template:
    metadata:
      name: "{{ .Release.Name }}-mongodb-set-job"
      labels:
        app.kubernetes.io/managed-by: {{ .Release.Service | quote }}
        app.kubernetes.io/instance: {{ .Release.Name | quote }}
        helm.sh/chart: "{{ .Chart.Name }}-{{ .Chart.Version }}"
    spec:
      restartPolicy: OnFailure
      volumes:
        - name: data-volume
          configMap:
            name: "{{ .Release.Name }}-mongodb-config"
      containers:
        - name: ddl-job
          image: "jclab/mongodb-init-helper:release-1.0.0"
          volumeMounts:
            - name: data-volume
              mountPath: /data
          command:
            - /start.sh
          args:
            - --pipeline-file=/data/pipeline.json
          env:
            - name: MONGODB_HOST
              value: {{ .Values.mongodbHost | quote }}
            - name: MONGODB_HOST
              value: {{ .Values.mongodbPort | quote }}
            - name: DB_ADMIN_USER
              value: {{ .Values.mongodbAdminUsername | quote }}
            - name: DB_ADMIN_PASS
              value: {{ .Values.mongodbAdminPassword | quote }}
```



## License

Apache-2.0

