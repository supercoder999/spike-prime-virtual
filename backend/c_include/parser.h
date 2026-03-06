#ifndef CENGINE_PARSER_H
#define CENGINE_PARSER_H

#include <stdbool.h>
#include <stddef.h>

typedef enum {
    EXPR_INT,
    EXPR_BOOL,
    EXPR_STRING,
    EXPR_LIST,
    EXPR_VAR,
    EXPR_ASSIGN,
    EXPR_CALL,
    EXPR_METHOD_CALL,
    EXPR_BINARY,
    EXPR_UNARY,
} ExprType;

typedef enum {
    OP_ADD,
    OP_SUB,
    OP_MUL,
    OP_DIV,
    OP_EQ,
    OP_NEQ,
    OP_LT,
    OP_LTE,
    OP_GT,
    OP_GTE,
    OP_NEG,
    OP_NOT,
} OpType;

typedef struct Expr Expr;
typedef struct Stmt Stmt;

struct Expr {
    ExprType type;
    union {
        long int_value;
        bool bool_value;
        char *string_value;
        struct {
            Expr **items;
            size_t count;
        } list;
        char *var_name;
        struct {
            char *name;
            Expr *value;
        } assign;
        struct {
            Expr *callee;
            Expr **args;
            size_t argc;
        } call;
        struct {
            Expr *object;
            char *method;
            Expr **args;
            size_t argc;
        } method_call;
        struct {
            OpType op;
            Expr *left;
            Expr *right;
        } binary;
        struct {
            OpType op;
            Expr *expr;
        } unary;
    } as;
};

typedef enum {
    STMT_LET,
    STMT_PRINT,
    STMT_EXPR,
    STMT_COLLECT,
    STMT_BLOCK,
    STMT_IF,
    STMT_WHILE,
    STMT_FUNC_DEF,
    STMT_RETURN,
} StmtType;

struct Stmt {
    StmtType type;
    union {
        struct {
            char *name;
            Expr *expr;
        } let_stmt;
        Expr *expr;
        struct {
            Stmt **items;
            size_t count;
        } block;
        struct {
            Expr *condition;
            Stmt *then_branch;
            Stmt *else_branch;
        } if_stmt;
        struct {
            Expr *condition;
            Stmt *body;
        } while_stmt;
        struct {
            char *name;
            char **params;
            size_t param_count;
            Stmt *body;
        } func_def;
        struct {
            Expr *value;
        } return_stmt;
    } as;
};

typedef struct {
    Stmt **items;
    size_t count;
    size_t capacity;
} Program;

Program *parser_parse_program(const char *source, char *error_buf, size_t error_buf_size);
void parser_free_program(Program *program);

#endif
