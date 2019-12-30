def col_generator(typ):
    def col_inner(column, name=None):
        if name is None:
            name = column
        return {"key": column, "name": name, "type": typ}

    return col_inner


str_col = col_generator("string")
int_col = col_generator("integer")
bool_col = col_generator("bool")
type_col = {"name": "type", "type": "mapping_value"}


tables = {}


def table(name, mappings, geom_type, columns=None, tags_from_member=False, **kwargs):
    assert type(mappings) == dict
    fields = [{"name": "osm_id", "type": "id"}]

    if geom_type != "relation":
        fields.append({"name": "geometry", "type": "geometry"})

    fields += columns or []

    tags_field = {"name": "tags", "type": "hstore_tags"}
    if tags_from_member:
        tags_field["from_member"] = True

    fields.append(tags_field)

    data = {"fields": fields}

    if type(geom_type) == list:
        data["type_mappings"] = {}
        for typ in geom_type:
            data["type_mappings"][typ] = mappings
        data["type"] = "geometry"
    else:
        data["mapping"] = mappings
        data["type"] = geom_type

    data.update(kwargs)
    tables[name] = data


def relation_tables(name, mappings, relation_types, relation_columns=None):
    table(name, mappings, "relation", relation_columns, relation_types=relation_types)
    table(
        f"{name}_member",
        mappings,
        "relation_member",
        columns=[
            {"name": "member", "type": "member_id"},
            {"name": "role", "type": "member_role"},
        ],
        relation_types=relation_types,
        tags_from_member=True,
    )
