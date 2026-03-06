#ifndef CENGINE_RUNTIME_H
#define CENGINE_RUNTIME_H

#include <stdbool.h>
#include <stddef.h>
#include <stdio.h>

#include "parser.h"

typedef struct UserFunction UserFunction;

typedef enum {
    FN_KIND_USER,
    FN_KIND_NATIVE,
} FunctionKind;

typedef struct FunctionValue {
    FunctionKind kind;
    UserFunction *user;
    const struct RuntimeNative *native;
} FunctionValue;

typedef enum {
    OBJ_INT,
    OBJ_BOOL,
    OBJ_STRING,
    OBJ_LIST,
    OBJ_FUNCTION,
} ObjType;

typedef struct Obj {
    bool marked;
    ObjType type;
    struct Obj *next;
    union {
        long int_value;
        bool bool_value;
        char *string_value;
        struct {
            struct Obj **items;
            size_t count;
            size_t capacity;
        } list;
        FunctionValue function;
    } as;
} Obj;

typedef long (*RuntimeNativeFn)(int argc, const long *argv, void *user_data, bool *ok);

typedef struct RuntimeNative {
    const char *name;
    RuntimeNativeFn fn;
    void *user_data;
} RuntimeNative;

typedef struct {
    Obj *objects;
    size_t num_objects;
    size_t max_objects;
} GC;

typedef struct Var {
    char *name;
    Obj *value;
    struct Var *next;
} Var;

typedef struct Env {
    Var *vars;
    struct Env *parent;
    struct Env *next_alloc;
} Env;

struct UserFunction {
    char *name;
    const Stmt *stmt;
    Env *closure;
    UserFunction *next;
};

typedef struct {
    GC gc;
    Env global_env;
    Env *env;
    Env *allocated_envs;
    UserFunction *functions;
    Obj **stack;
    size_t stack_count;
    size_t stack_capacity;
    FILE *out;
    const RuntimeNative *natives;
    size_t native_count;
    bool returning;
    Obj *return_value;
    int call_depth;
    bool had_error;
    char error[256];
} Runtime;

void runtime_init(Runtime *rt, FILE *out);
void runtime_set_natives(Runtime *rt, const RuntimeNative *natives, size_t native_count);
void runtime_free(Runtime *rt);
bool runtime_execute(Runtime *rt, Program *program);
const char *runtime_error(Runtime *rt);

void runtime_mark_roots(Runtime *rt);

#endif
